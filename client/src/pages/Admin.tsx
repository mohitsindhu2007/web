import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Product } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { 
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Loader2, Pencil, Trash, LogOut, Upload, Image, ImagePlus, X } from "lucide-react";
import LoginForm from "@/components/LoginForm";

// Helper function to validate image URL
const isValidImageUrl = (url: string) => {
  // Check if it's a server path starting with '/uploads/' or a valid URL
  return url.startsWith('/uploads/') || url.match(/^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/);
};

// Product form schema
const productSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  price: z.coerce.number().min(1, "Price must be at least 1"),
  category: z.string().min(1, "Category is required"),
  imageUrl: z.string().refine(val => isValidImageUrl(val), {
    message: "Please provide a valid image URL or upload an image"
  }),
  additionalImages: z.array(
    z.string().refine(val => isValidImageUrl(val), {
      message: "All additional images must be valid URLs or uploaded images"
    })
  ).optional().default([]),
  featured: z.boolean().default(false),
  discountPrice: z.coerce.number().nullable().optional(),
});

type ProductFormValues = z.infer<typeof productSchema>;

// Contact message interface
interface ContactMessage {
  id: number;
  name: string;
  email: string;
  phone: string;
  message: string;
  createdAt: string;
}

const Admin = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedTab, setSelectedTab] = useState("products");
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [currentProduct, setCurrentProduct] = useState<Product | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fileInputEditRef = useRef<HTMLInputElement>(null);

  // Check if user is already logged in
  useEffect(() => {
    const loggedInStatus = localStorage.getItem("isLoggedIn");
    if (loggedInStatus === "true") {
      setIsLoggedIn(true);
    }
  }, []);

  // Fetch products
  const { data: products, isLoading: isLoadingProducts } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  // Fetch contact messages
  const { data: contactMessages, isLoading: isLoadingMessages } = useQuery<ContactMessage[]>({
    queryKey: ["/api/contact/messages"],
  });

  // Delete product mutation
  const deleteProductMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/products/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({
        title: "प्रोडक्ट हटा दिया गया",
        description: "प्रोडक्ट सफलतापूर्वक हटा दिया गया है",
      });
    },
    onError: () => {
      toast({
        title: "त्रुटि",
        description: "प्रोडक्ट हटाने में विफल रहा",
        variant: "destructive",
      });
    },
  });

  // Create product form
  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: "",
      description: "",
      price: 0,
      category: "",
      imageUrl: "",
      additionalImages: [],
      featured: false,
      discountPrice: null,
    },
  });

  // Create product mutation
  const createProductMutation = useMutation({
    mutationFn: async (data: ProductFormValues) => {
      const response = await apiRequest("POST", "/api/products", data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Product created",
        description: "The product has been created successfully.",
      });
      form.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create product. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Edit product mutation
  const editProductMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: ProductFormValues }) => {
      const response = await apiRequest("PUT", `/api/products/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Product updated",
        description: "The product has been updated successfully.",
      });
      setIsEditModalOpen(false);
      setCurrentProduct(null);
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update product. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Edit form
  const editForm = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: "",
      description: "",
      price: 0,
      category: "",
      imageUrl: "",
      additionalImages: [],
      featured: false,
      discountPrice: null,
    },
  });

  // Update edit form when currentProduct changes
  useEffect(() => {
    if (currentProduct) {
      editForm.reset({
        name: currentProduct.name,
        description: currentProduct.description,
        price: currentProduct.price,
        category: currentProduct.category,
        imageUrl: currentProduct.imageUrl,
        additionalImages: currentProduct.additionalImages || [],
        featured: currentProduct.featured || false,
        discountPrice: currentProduct.discountPrice || null,
      });
    }
  }, [currentProduct, editForm]);

  // Handle product create form submission
  const onSubmit = (data: ProductFormValues) => {
    createProductMutation.mutate(data);
  };

  // Handle product edit form submission
  const onEditSubmit = (data: ProductFormValues) => {
    if (currentProduct) {
      editProductMutation.mutate({ id: currentProduct.id, data });
    }
  };

  // Handle edit product button click
  const handleEditProduct = (product: Product) => {
    setCurrentProduct(product);
    setIsEditModalOpen(true);
  };

  // Handle delete product button click
  const handleDeleteProduct = (id: number) => {
    if (window.confirm("क्या आप वाकई इस प्रोडक्ट को हटाना चाहते हैं?")) {
      deleteProductMutation.mutate(id);
    }
  };

  // Handle image upload
  const handleImageUpload = async (files: FileList | null, isEditMode = false) => {
    if (!files || files.length === 0) return;
    
    try {
      setIsUploading(true);
      const formData = new FormData();
      
      // Limit the number of files to prevent crashing
      const filesToUpload = Array.from(files).slice(0, 5); // Limit to 5 images at once
      
      filesToUpload.forEach(file => {
        formData.append('images', file);
      });

      toast({
        title: "अपलोड हो रहा है",
        description: "कृपया प्रतीक्षा करें...",
      });
      
      // Show uploading toast
      toast({
        title: "Uploading images",
        description: `Uploading ${filesToUpload.length} image(s)...`,
      });
      
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error(`Server responded with status: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (result.success && result.files && result.files.length > 0) {
        const uploadedUrls = result.files;
        setUploadedImages(prev => [...prev, ...uploadedUrls]);
        
        toast({
          title: "Upload successful",
          description: `${filesToUpload.length} image(s) uploaded successfully.`,
        });
        
        // Get the current form based on mode
        const currentForm = isEditMode ? editForm : form;
        
        // Always set the main image if it's not already set
        const currentMainImage = currentForm.getValues('imageUrl');
        if (!currentMainImage || currentMainImage === '') {
          currentForm.setValue('imageUrl', uploadedUrls[0]);
        }
        
        // Add rest of images to additionalImages array
        const remainingImages = uploadedUrls.slice(currentMainImage ? 0 : 1);
        
        if (remainingImages.length > 0) {
          const currentAdditionalImages = currentForm.getValues('additionalImages') || [];
          currentForm.setValue('additionalImages', [
            ...currentAdditionalImages,
            ...remainingImages
          ]);
        }
        
        // Trigger form validation after setting values
        currentForm.trigger('imageUrl');
        currentForm.trigger('additionalImages');
      } else {
        toast({
          title: "Upload failed",
          description: result.message || "Failed to upload images",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Upload failed",
        description: "An error occurred while uploading images",
        variant: "destructive",
      });
      console.error('Upload error:', error);
    } finally {
      setIsUploading(false);
    }
  };

  // Handle remove image
  const handleRemoveImage = (index: number) => {
    const currentImages = form.getValues('additionalImages');
    const updatedImages = [...currentImages];
    updatedImages.splice(index, 1);
    form.setValue('additionalImages', updatedImages);
  };

  // Handle logout
  const handleLogout = () => {
    localStorage.removeItem("isLoggedIn");
    setIsLoggedIn(false);
    toast({
      title: "Logged out",
      description: "You have been successfully logged out.",
    });
  };
  
  if (!isLoggedIn) {
    return <LoginForm onLoginSuccess={() => setIsLoggedIn(true)} />;
  }

  return (
    <div className="container mx-auto py-10 px-4">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <Button variant="outline" onClick={handleLogout}>
          <LogOut className="h-4 w-4 mr-2" />
          Logout
        </Button>
      </div>

      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="mb-8">
          <TabsTrigger value="products">Manage Products</TabsTrigger>
          <TabsTrigger value="messages">Contact Messages</TabsTrigger>
        </TabsList>

        {/* Products Tab */}
        <TabsContent value="products">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Add Product Form */}
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle>Add New Product</CardTitle>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Product Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter product name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Enter product description" 
                              rows={4} 
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="price"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Price (₹)</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                placeholder="0"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="discountPrice"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Discount Price (₹)</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                placeholder="Optional"
                                value={field.value === null ? "" : field.value}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  field.onChange(value === "" ? null : parseInt(value));
                                }}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="condition"
                      render={({ field }) => (
                        <FormItem className="w-full">
                          <FormLabel className="text-base">Product Condition</FormLabel>
                          <Select 
                            onValueChange={field.onChange} 
                            defaultValue={field.value || "New"}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select condition" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="New">New</SelectItem>
                              <SelectItem value="Refurbished">Refurbished</SelectItem>
                              <SelectItem value="Used">Used</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="category"
                      render={({ field }) => (
                        <FormItem className="w-full">
                          <FormLabel className="text-base">Product Category</FormLabel>
                          <Select 
                            onValueChange={field.onChange} 
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select a category" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Furniture">Furniture</SelectItem>
                              <SelectItem value="Electronics">Electronics</SelectItem>
                              <SelectItem value="Refurbished">Refurbished</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="imageUrl"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Main Image</FormLabel>
                          <div className="space-y-4">
                            <FormControl>
                              <Input 
                                placeholder="https://example.com/image.jpg" 
                                {...field} 
                              />
                            </FormControl>
                            
                            <div className="flex flex-col space-y-2">
                              <div className="flex items-center gap-2">
                                <Button 
                                  type="button" 
                                  variant="outline" 
                                  onClick={() => fileInputRef.current?.click()}
                                  disabled={isUploading}
                                >
                                  {isUploading ? (
                                    <>
                                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                      Uploading...
                                    </>
                                  ) : (
                                    <>
                                      <Upload className="mr-2 h-4 w-4" />
                                      Upload Images
                                    </>
                                  )}
                                </Button>
                                <input
                                  type="file"
                                  ref={fileInputRef}
                                  className="hidden"
                                  accept="image/*,video/*"
                                  multiple
                                  onChange={(e) => handleImageUpload(e.target.files, false)}
                                />
                              </div>

                              {field.value && (
                                <div className="mt-2 border rounded-md p-2">
                                  <div className="text-sm text-gray-500 mb-2">Main Image:</div>
                                  <div className="relative w-full h-32 bg-gray-100 rounded-md overflow-hidden">
                                    <img 
                                      src={field.value} 
                                      alt="Main product image" 
                                      className="w-full h-full object-contain"
                                      onError={(e) => {
                                        const target = e.target as HTMLImageElement;
                                        target.src = 'https://via.placeholder.com/150?text=Image+Not+Found';
                                        target.onerror = null;
                                      }}
                                    />
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="additionalImages"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Additional Images</FormLabel>
                          <div className="space-y-4">
                            {field.value.length > 0 ? (
                              <div className="p-2 border rounded-md">
                                <Carousel className="w-full max-w-full">
                                  <CarouselContent>
                                    {field.value.map((image, index) => (
                                      <CarouselItem key={index} className="basis-1/3">
                                        <div className="relative rounded-md overflow-hidden p-1">
                                          <div className="aspect-square relative overflow-hidden rounded-md">
                                            <img 
                                              src={image} 
                                              alt={`Product image ${index + 1}`} 
                                              className="object-contain w-full h-full"
                                              onError={(e) => {
                                                const target = e.target as HTMLImageElement;
                                                target.src = 'https://via.placeholder.com/150?text=Image+Not+Found';
                                                target.onerror = null;
                                              }}
                                            />
                                            <Button
                                              type="button"
                                              variant="destructive"
                                              size="icon"
                                              className="absolute top-1 right-1 h-6 w-6 rounded-full"
                                              onClick={() => handleRemoveImage(index)}
                                            >
                                              <X className="h-3 w-3" />
                                            </Button>
                                          </div>
                                        </div>
                                      </CarouselItem>
                                    ))}
                                  </CarouselContent>
                                  <CarouselPrevious />
                                  <CarouselNext />
                                </Carousel>
                              </div>
                            ) : (
                              <div className="text-sm text-gray-500 italic">
                                No additional images. Upload images to add them here.
                              </div>
                            )}
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="featured"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                          <div className="space-y-0.5">
                            <FormLabel>Featured Product</FormLabel>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <Button 
                      type="submit" 
                      className="w-full"
                      disabled={createProductMutation.isPending}
                    >
                      {createProductMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Adding...
                        </>
                      ) : "Add Product"}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>

            {/* Products List */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Product List</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingProducts ? (
                  <div className="flex justify-center items-center h-40">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : products && products.length > 0 ? (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Category</TableHead>
                          <TableHead>Condition</TableHead>
                          <TableHead>Price</TableHead>
                          <TableHead>Featured</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {products.map((product) => (
                          <TableRow key={product.id}>
                            <TableCell className="font-medium">{product.name}</TableCell>
                            <TableCell>{product.category}</TableCell>
                            <TableCell>
                              <span className={`px-2 py-1 rounded-full text-xs ${
                                product.condition === 'New' ? 'bg-green-100 text-green-800' :
                                product.condition === 'Refurbished' ? 'bg-blue-100 text-blue-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {product.condition}
                              </span>
                            </TableCell>
                            <TableCell>
                              {product.discountPrice ? (
                                <>
                                  <span className="text-primary font-semibold">₹{product.discountPrice.toLocaleString()}</span>
                                  <span className="text-gray-400 line-through ml-2">₹{product.price.toLocaleString()}</span>
                                </>
                              ) : (
                                <>₹{product.price.toLocaleString()}</>
                              )}
                            </TableCell>
                            <TableCell>{product.featured ? "Yes" : "No"}</TableCell>
                            <TableCell className="space-x-2">
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => handleEditProduct(product)}
                              >
                                <Pencil className="h-4 w-4 mr-1" /> Edit
                              </Button>
                              <Button 
                                variant="destructive" 
                                size="sm"
                                onClick={() => handleDeleteProduct(product.id)}
                                disabled={deleteProductMutation.isPending}
                              >
                                <Trash className="h-4 w-4 mr-1" /> Delete
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">No products found. Add your first product using the form.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Contact Messages Tab */}
        <TabsContent value="messages">
          <Card>
            <CardHeader>
              <CardTitle>Contact Form Messages</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingMessages ? (
                <div className="flex justify-center items-center h-40">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : contactMessages && contactMessages.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>Message</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {contactMessages.map((message) => (
                        <TableRow key={message.id}>
                          <TableCell className="font-medium">{message.name}</TableCell>
                          <TableCell>{message.email}</TableCell>
                          <TableCell>{message.phone}</TableCell>
                          <TableCell className="max-w-xs truncate">{message.message}</TableCell>
                          <TableCell>{new Date(message.createdAt).toLocaleDateString()}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No contact messages yet.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Product Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle>Edit Product</DialogTitle>
            <DialogDescription>
              Make changes to the product details below.
            </DialogDescription>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
              <FormField
                control={editForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Product Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter product name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={editForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Enter product description" 
                        rows={4} 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={editForm.control}
                  name="price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Price (₹)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="0"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={editForm.control}
                  name="discountPrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Discount Price (₹)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="Optional"
                          value={field.value === null ? "" : field.value}
                          onChange={(e) => {
                            const value = e.target.value;
                            field.onChange(value === "" ? null : parseInt(value));
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={editForm.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Furniture">Furniture</SelectItem>
                        <SelectItem value="Electronics">Electronics</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={editForm.control}
                name="imageUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Main Image</FormLabel>
                    <div className="space-y-4">
                      <FormControl>
                        <Input 
                          placeholder="https://example.com/image.jpg" 
                          {...field} 
                        />
                      </FormControl>
                      
                      <div className="flex flex-col space-y-2">
                        <div className="flex items-center gap-2">
                          <Button 
                            type="button" 
                            variant="outline" 
                            onClick={() => fileInputEditRef.current?.click()}
                            disabled={isUploading}
                            className="w-full"
                          >
                            {isUploading ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Uploading...
                              </>
                            ) : (
                              <>
                                <Upload className="mr-2 h-4 w-4" />
                                Upload Images
                              </>
                            )}
                          </Button>
                          <input 
                            type="file"
                            ref={fileInputEditRef}
                            className="hidden"
                            accept="image/*"
                            multiple
                            onChange={(e) => handleImageUpload(e.target.files, true)}
                          />
                        </div>
                        
                        {field.value && (
                          <div className="mt-2 border rounded-md p-2">
                            <div className="text-sm text-gray-500 mb-2">Main Image:</div>
                            <div className="relative w-full h-32 bg-gray-100 rounded-md overflow-hidden">
                              <img 
                                src={field.value} 
                                alt="Main product image" 
                                className="w-full h-full object-contain"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.src = 'https://via.placeholder.com/150?text=Image+Not+Found';
                                  target.onerror = null;
                                }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={editForm.control}
                name="additionalImages"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Additional Images</FormLabel>
                    <FormControl>
                      <div>
                        {field.value && field.value.length > 0 ? (
                          <div className="grid grid-cols-2 gap-4 mb-4">
                            {field.value.map((url, index) => (
                              <div key={index} className="relative border rounded-md overflow-hidden">
                                <img 
                                  src={url} 
                                  alt={`Additional image ${index + 1}`}
                                  className="w-full h-32 object-contain"
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    target.src = 'https://via.placeholder.com/150?text=Image+Not+Found';
                                    target.onerror = null;
                                  }}
                                />
                                <Button 
                                  type="button"
                                  variant="destructive"
                                  size="sm"
                                  className="absolute top-2 right-2 w-6 h-6 p-0"
                                  onClick={() => {
                                    const currentImages = [...field.value];
                                    currentImages.splice(index, 1);
                                    editForm.setValue('additionalImages', currentImages);
                                  }}
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-sm text-gray-500 mb-4">
                            No additional images. Upload multiple images to add them here.
                          </div>
                        )}
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={editForm.control}
                name="featured"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel>Featured Product</FormLabel>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsEditModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit"
                  disabled={editProductMutation.isPending}
                >
                  {editProductMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : "Save Changes"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Admin;